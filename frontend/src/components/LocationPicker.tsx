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
}

const LocationPicker: React.FC<LocationPickerProps> = ({
    value,
    onChange,
    placeholder = '',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tempLocation, setTempLocation] = useState<Location | null>(value);
    const [isLoadingAddress, setIsLoadingAddress] = useState(false);
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
                                        <span className="flex items-center justify-center">
                                            <svg className="w-4 h-4 mr-2 -ml-1 text-blue-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {t('location.loadingAddress', { defaultValue: 'Loading address...' })}
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

            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm text-left flex items-center justify-between min-h-[2.5rem]"
            >
                <span className={value ? '' : 'text-gray-500 dark:text-gray-400'}>
                    {value ? formatLocationDisplay(value) : placeholder}
                </span>
                <svg
                    className="flex-shrink-0 w-4 h-4 ml-2 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-5xl overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-2xl dark:bg-gray-900 dark:border-gray-700">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <p className="text-xs tracking-wider text-gray-500 uppercase dark:text-gray-400">
                                    {t('location.selectLocation', { defaultValue: 'Select Location' })}
                                </p>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {t('location.chooseLocation', { defaultValue: 'Choose Activity Location' })}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="p-2 text-gray-400 transition-colors rounded-lg hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                aria-label={t('common.close')}
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-4">
                            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                                {t('location.clickToSelect', { defaultValue: 'Click on the map to select the activity location' })}
                            </p>

                            {tempLocation && (
                                <div className="p-3 mb-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {t('location.selectedCoordinates', { defaultValue: 'Selected:' })}
                                            </p>
                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                                {isLoadingAddress ? (
                                                    <span>{t('location.loadingAddress')}</span>
                                                ) : (
                                                    formatLocationDisplay(tempLocation)
                                                )}
                                            </p>
                                        </div>
                                        {tempLocation.address && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {tempLocation.lat.toFixed(6)}, {tempLocation.lng.toFixed(6)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="h-[500px] rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
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

                            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-400"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    disabled={!tempLocation}
                                    className="px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
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