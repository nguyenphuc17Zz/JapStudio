"""Create the application databases (development and test) if they do not exist.

Run from apps/api:
    python scripts/create_databases.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pymysql
from app.core.config import get_settings
from sqlalchemy.engine import make_url


def main() -> None:
    url = make_url(get_settings().database_url)
    databases = {url.database}
    if url.database:
        databases.add(f"{url.database}_test")

    connection = pymysql.connect(
        host=url.host or "localhost",
        port=url.port or 3306,
        user=url.username or "root",
        password=url.password or "",
        charset="utf8mb4",
    )
    try:
        with connection.cursor() as cursor:
            for database in databases:
                if not database:
                    continue
                cursor.execute(
                    f"CREATE DATABASE IF NOT EXISTS `{database}` "
                    "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
                print(f"Database '{database}' is ready.")
    finally:
        connection.close()


if __name__ == "__main__":
    main()
