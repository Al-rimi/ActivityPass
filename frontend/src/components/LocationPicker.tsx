import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import 'leaflet/dist/leaflet.css';

// Load AMap JavaScript API (optional - only if API key is configured)
const loadAMapScript = () => {
    return new Promise<void>((resolve, reject) => {
        if ((window as any).AMap && (window as any).AMap.Geocoder) {
            resolve();
            return;
        }

        // Get AMap API key from environment variables
        const amapKey = import.meta.env.REACT_APP_AMAP_KEY || import.meta.env.VITE_AMAP_KEY;

        if (!amapKey || amapKey === 'your_amap_api_key_here') {
            // Skip loading if no valid API key is configured
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}&plugin=AMap.Geocoder`;
        script.async = true;

        script.onload = () => {
            // Wait a bit for AMap to fully initialize
            setTimeout(() => {
                if ((window as any).AMap) {
                    resolve();
                } else {
                    reject(new Error('AMap failed to initialize'));
                }
            }, 1000);
        };

        script.onerror = () => reject(new Error('Failed to load AMap script'));
        document.head.appendChild(script);
    });
};

// Fix for default markers in react-leaflet
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Location {
    lat: number;
    lng: number;
    address?: string;
}

interface LocationPickerProps {
    value: Location | null;
    onChange: (location: Location | null) => void;
    placeholder?: string;
    className?: string;
    label?: string;
    id?: string;
    disabled?: boolean;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
    value,
    onChange,
    placeholder = '',
    className = '',
    label = '',
    id,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tempLocation, setTempLocation] = useState<Location | null>(value);
    const [isLoadingAddress, setIsLoadingAddress] = useState(false);
    const [focused, setFocused] = useState(false);
    const { t, i18n } = useTranslation();
    const mapRef = useRef<L.Map | null>(null);

    useEffect(() => {
        setTempLocation(value);
    }, [value]);

    // Load AMap script when component mounts (optional - for enhanced geocoding)
    useEffect(() => {
        const amapKey = import.meta.env.REACT_APP_AMAP_KEY || import.meta.env.VITE_AMAP_KEY;
        if (amapKey && amapKey !== 'your_amap_api_key_here') {
            loadAMapScript().catch(error => {
                // Silently fail - AMap is optional, other geocoding services will work
                console.debug('AMap script loading skipped or failed:', error.message);
            });
        }
    }, []);

    // Reverse geocoding function using services that work in China
    const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
        // Try multiple geocoding services, prioritizing ones that work in China

        // First try: AMap JavaScript API (works in China, returns Chinese addresses)
        if ((window as any).AMap && (window as any).AMap.Geocoder) {
            try {
                const geocoder = new (window as any).AMap.Geocoder({
                    radius: 1000,
                    extensions: 'all',
                    lang: 'zh_cn' // Ensure Chinese language
                });

                return new Promise((resolve) => {
                    geocoder.getAddress([lng, lat], (status: string, result: any) => {
                        if (status === 'complete' && result && result.regeocode && result.regeocode.formattedAddress) {
                            // AMap returns proper Chinese addresses - remove commas for Chinese addresses
                            let address = result.regeocode.formattedAddress;
                            // Check if this looks like a Chinese address (contains Chinese characters)
                            if (/[\u4e00-\u9fff]/.test(address)) {
                                // Remove commas and extra spaces for Chinese addresses
                                address = address.replace(/,/g, '').replace(/\s+/g, '');
                            }
                            resolve(address);
                        } else {
                            resolve(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                        }
                    });
                });
            } catch (error) {
                console.warn('AMap JavaScript geocoding failed:', error);
            }
        }

        // Second try: AMap REST API (requires API key, works in China, returns Chinese addresses)
        try {
            // Get AMap API key from environment variables
            const amapKey = import.meta.env.REACT_APP_AMAP_KEY || import.meta.env.VITE_AMAP_KEY;

            if (amapKey && amapKey !== 'your_amap_api_key_here') {
                const response = await fetch(
                    `https://restapi.amap.com/v3/geocode/regeo?key=${amapKey}&location=${lng},${lat}&extensions=base&batch=false&roadlevel=0`,
                    {
                        headers: {
                            'Accept': 'application/json'
                        }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data.status === '1' && data.regeocode && data.regeocode.formatted_address) {
                        let address = data.regeocode.formatted_address;
                        // Check if this looks like a Chinese address (contains Chinese characters)
                        if (/[\u4e00-\u9fff]/.test(address)) {
                            // Remove commas and extra spaces for Chinese addresses
                            address = address.replace(/,/g, '').replace(/\s+/g, '');
                        }
                        return address;
                    }
                }
            }
        } catch (error) {
            console.warn('AMap REST geocoding failed:', error);
        }

        // Third try: Baidu Maps API (works in China, returns Chinese addresses)
        try {
            // Get Baidu API key from environment variables
            const baiduKey = import.meta.env.REACT_APP_BAIDU_MAP_KEY || import.meta.env.VITE_BAIDU_MAP_KEY;

            if (baiduKey && baiduKey !== 'your_baidu_api_key_here') {
                const response = await fetch(
                    `https://api.map.baidu.com/reverse_geocoding/v3/?ak=${baiduKey}&output=json&coordtype=wgs84ll&location=${lat},${lng}`,
                    {
                        headers: {
                            'Accept': 'application/json'
                        }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 0 && data.result && data.result.formatted_address) {
                        let address = data.result.formatted_address;
                        // Check if this looks like a Chinese address (contains Chinese characters)
                        if (/[\u4e00-\u9fff]/.test(address)) {
                            // Remove commas and extra spaces for Chinese addresses
                            address = address.replace(/,/g, '').replace(/\s+/g, '');
                        }
                        return address;
                    }
                }
            }
        } catch (error) {
            console.warn('Baidu geocoding failed:', error);
        }

        // Fourth try: Nominatim with Chinese language preference
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=zh-CN,zh,en`,
                {
                    headers: {
                        'User-Agent': 'ActivityPass/1.0',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data && data.display_name) {
                    return data.display_name;
                }
            }
        } catch (error) {
            console.warn('Nominatim geocoding failed:', error);
        }

        // Fifth try: Alternative Nominatim instance
        try {
            const response = await fetch(
                `https://nominatim.openstreetmaps.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=zh-CN,zh,en`,
                {
                    headers: {
                        'User-Agent': 'ActivityPass/1.0',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data && data.display_name) {
                    return data.display_name;
                }
            }
        } catch (error) {
            console.warn('Alternative Nominatim geocoding failed:', error);
        }

        // Final fallback: return coordinates only
        console.warn('All geocoding services failed, returning coordinates');
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    };

    const handleLocationSelect = async (lat: number, lng: number) => {
        setIsLoadingAddress(true);
        try {
            const address = await reverseGeocode(lat, lng);
            const location = { lat, lng, address };
            setTempLocation(location);
        } catch (error) {
            console.warn('Failed to get address:', error);
            const location = { lat, lng };
            setTempLocation(location);
        } finally {
            setIsLoadingAddress(false);
        }
    };

    const handleConfirm = () => {
        onChange(tempLocation);
        setIsOpen(false);
    };

    const handleCancel = () => {
        setTempLocation(value);
        setIsOpen(false);
    };

    const formatLocationDisplay = (location: Location | null) => {
        if (!location) return '';
        if (location.address) return location.address;
        if (typeof location.lat === 'number' && typeof location.lng === 'number') {
            return `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
        }
        return '';
    };

    // Component to handle map clicks and show markers
    const LocationMarker = () => {
        const map = useMap();

        useMapEvents({
            click(e) {
                handleLocationSelect(e.latlng.lat, e.latlng.lng);
            },
        });

        return (
            <>
                {/* Selected location marker */}
                {tempLocation && (
                    <Marker position={[tempLocation.lat, tempLocation.lng]}>
                        <Popup>
                            <div className="text-center">
                                <div className="mb-1 font-semibold text-gray-900 dark:text-white">
                                    {t('location.selectedLocation')}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    {isLoadingAddress ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="inline-block w-4 h-4 border-4 border-app-light-accent/30 border-t-app-light-accent rounded-full animate-spin dark:border-app-dark-accent/30 dark:border-t-app-dark-accent"></div>
                                            {t('location.loadingAddress')}
                                        </span>
                                    ) : (
                                        formatLocationDisplay(tempLocation)
                                    )}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                )}
            </>
        );
    };

    // Component to set map language and customize controls
    const MapController = () => {
        const map = useMap();
        mapRef.current = map;

        useEffect(() => {
            if (map) {
                // Remove attribution
                map.attributionControl.setPrefix('');

                // Customize zoom control styling
                const zoomControl = map.zoomControl;
                if (zoomControl) {
                    const container = zoomControl.getContainer();
                    if (container) {
                        container.className = container.className.replace('leaflet-control-zoom', 'leaflet-control-zoom custom-zoom-control');
                    }
                }

                // Set map language based on i18n
                const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';
                // Note: Leaflet doesn't have built-in language switching, but we can customize tooltips
                const zoomInBtn = document.querySelector('.leaflet-control-zoom-in') as HTMLElement;
                const zoomOutBtn = document.querySelector('.leaflet-control-zoom-out') as HTMLElement;

                if (zoomInBtn) {
                    zoomInBtn.title = lang === 'zh' ? '放大' : 'Zoom in';
                }
                if (zoomOutBtn) {
                    zoomOutBtn.title = lang === 'zh' ? '缩小' : 'Zoom out';
                }
            }
        }, [map, i18n.language]);

        return null;
    };

    const getInitialCenter = () => {
        if (tempLocation) return [tempLocation.lat, tempLocation.lng];
        // ZJNU University coordinates (浙江师范大学)
        return [29.1291, 119.6494];
    };

    return (
        <div className={`relative ${className}`}>
            <div className={`relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover ${disabled ? 'bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary' : 'bg-app-light-input-bg dark:bg-app-dark-input-bg'}`}>
                <button
                    id={id}
                    type="button"
                    onClick={() => !disabled && setIsOpen(true)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    disabled={disabled}
                    className={`w-full px-4 pt-5 pb-3 text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg text-left flex items-center justify-between h-[3.5rem] relative ${disabled ? 'text-app-light-text-secondary dark:text-app-dark-text-secondary' : 'bg-transparent hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover'}`}
                >
                    <div className="flex-1 pr-6 overflow-hidden relative">
                        {value ? (
                            <div className="relative w-full">
                                <span className="block overflow-hidden whitespace-nowrap text-app-light-text-primary dark:text-app-dark-text-primary">
                                    {formatLocationDisplay(value)}
                                </span>
                                {/* Gradient overlay for overflow like multi-select inputs */}
                                <div className={`absolute inset-y-0 right-0 w-8 bg-gradient-to-l ${disabled ? 'from-app-light-surface-secondary to-transparent dark:from-app-dark-surface-secondary' : 'from-app-light-input-bg to-transparent dark:from-app-dark-input-bg'} pointer-events-none`}></div>
                            </div>
                        ) : (
                            <span className="text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                {label !== undefined ? '' : placeholder}
                            </span>
                        )}
                    </div>
                    <svg
                        className="w-4 h-4 text-app-light-text-secondary absolute right-3 top-1/2 transform -translate-y-1/2 dark:text-app-dark-text-secondary flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
                {label && (
                    <label
                        htmlFor={id}
                        className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${(value && (value.address || (value.lat && value.lng)))
                            ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                            : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                            } ${disabled ? 'text-app-light-text-secondary dark:text-app-dark-text-secondary' : ''}`}
                    >
                        {label}
                    </label>
                )}
            </div>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-5xl overflow-hidden border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <p className="text-xs tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('location.selectLocation', { defaultValue: 'Select Location' })}
                                </p>
                                <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                                    {t('location.chooseLocation', { defaultValue: 'Choose Activity Location' })}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover"
                                aria-label={t('common.close')}
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-4">
                            <p className="mb-4 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                {t('location.clickToSelect', { defaultValue: 'Click on the map to select the activity location' })}
                            </p>

                            {tempLocation && (
                                <div className="p-3 mb-4 border rounded-lg border-app-light-border bg-app-light-surface dark:bg-app-dark-surface dark:border-app-dark-border">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-app-light-text-primary dark:text-app-dark-text-primary">
                                                {t('location.selectedCoordinates', { defaultValue: 'Selected:' })}
                                            </p>
                                            <p className="mt-1 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                {isLoadingAddress ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <div className="inline-block w-4 h-4 border-4 border-app-light-accent/30 border-t-app-light-accent rounded-full animate-spin dark:border-app-dark-accent/30 dark:border-t-app-dark-accent"></div>
                                                        {t('location.loadingAddress')}
                                                    </span>
                                                ) : (
                                                    tempLocation ? formatLocationDisplay(tempLocation) : ''
                                                )}
                                            </p>
                                        </div>
                                        {tempLocation?.address && (
                                            <div className="text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                {tempLocation.lat.toFixed(6)}, {tempLocation.lng.toFixed(6)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="h-[500px] rounded-lg overflow-hidden border border-app-light-border dark:border-app-dark-border">
                                <MapContainer
                                    center={getInitialCenter() as [number, number]}
                                    zoom={15}
                                    style={{ height: '100%', width: '100%' }}
                                    className="rounded-lg"
                                >
                                    <TileLayer
                                        url="https://webst01.is.autonavi.com/appmaptile?style=7&x={x}&y={y}&z={z}"
                                        attribution='&copy; <a href="https://www.amap.com/">高德地图</a>'
                                    />
                                    <LocationMarker />
                                    <MapController />
                                </MapContainer>
                            </div>

                            <div className="flex items-center justify-end gap-3 p-4 border-t border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface/50">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-4 py-2 text-sm font-medium transition-colors border rounded-lg text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover focus:ring-2 focus:ring-app-light-accent focus:ring-offset-2 dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-accent"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    disabled={!tempLocation}
                                    className="px-4 py-2 text-sm font-medium text-white transition-colors border border-transparent rounded-lg bg-app-light-accent hover:bg-app-light-accent-hover focus:ring-2 focus:ring-app-light-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover dark:focus:ring-app-dark-accent"
                                >
                                    {t('location.confirmLocation', { defaultValue: 'Confirm Location' })}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationPicker;