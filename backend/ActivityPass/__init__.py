"""ActivityPass Django project package."""

# Install PyMySQL as MySQLdb if available (for MySQL connectivity)
try:
	import pymysql  # type: ignore
	pymysql.install_as_MySQLdb()
except Exception:
	pass

