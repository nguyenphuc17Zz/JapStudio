import ipaddress
import socket
from urllib.parse import urlparse
from typing import Tuple


class SSRFSecurityException(Exception):
    """Raised when a URL targets a disallowed private, loopback, or metadata address."""
    pass


# Private & restricted IPv4/IPv6 CIDR networks to block
DISALLOWED_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),          # Current network (only valid as source address)
    ipaddress.ip_network("10.0.0.0/8"),         # Private-Use (RFC 1918)
    ipaddress.ip_network("100.64.0.0/10"),      # Shared Address Space (RFC 6598)
    ipaddress.ip_network("127.0.0.0/8"),        # Loopback
    ipaddress.ip_network("169.254.0.0/16"),     # Link Local / AWS/GCP metadata
    ipaddress.ip_network("172.16.0.0/12"),      # Private-Use (RFC 1918)
    ipaddress.ip_network("192.0.0.0/24"),       # IETF Protocol Assignments
    ipaddress.ip_network("192.0.2.0/24"),       # Documentation (TEST-NET-1)
    ipaddress.ip_network("192.168.0.0/16"),     # Private-Use (RFC 1918)
    ipaddress.ip_network("198.18.0.0/15"),      # Benchmarking
    ipaddress.ip_network("198.51.100.0/24"),    # Documentation (TEST-NET-2)
    ipaddress.ip_network("203.0.113.0/24"),     # Documentation (TEST-NET-3)
    ipaddress.ip_network("224.0.0.0/4"),        # Multicast
    ipaddress.ip_network("240.0.0.0/4"),        # Reserved for Future Use
    ipaddress.ip_network("255.255.255.255/32"), # Limited Broadcast
    ipaddress.ip_network("::1/128"),            # IPv6 Loopback
    ipaddress.ip_network("::/128"),             # IPv6 Unspecified
    ipaddress.ip_network("fc00::/7"),           # IPv6 Unique Local
    ipaddress.ip_network("fe80::/10"),          # IPv6 Link-Local
]


class SSRFValidator:
    """Validates destination URLs to prevent Server-Side Request Forgery."""

    ALLOWED_SCHEMES = {"http", "https"}

    @classmethod
    def validate_url(cls, url: str) -> Tuple[bool, str]:
        """Validates that a URL is safe to fetch via HTTP/HTTPS.
        
        Returns:
            Tuple[bool, str]: (is_valid, error_message)
        Raises:
            SSRFSecurityException if URL is dangerous or blocked.
        """
        if not url or not isinstance(url, str):
            raise SSRFSecurityException("URL must be a non-empty string.")

        parsed = urlparse(url.strip())

        # 1. Scheme check
        scheme = (parsed.scheme or "").lower()
        if scheme not in cls.ALLOWED_SCHEMES:
            raise SSRFSecurityException(
                f"Disallowed URL scheme '{scheme}'. Only http and https are permitted."
            )

        hostname = parsed.hostname
        if not hostname:
            raise SSRFSecurityException("URL is missing a valid host.")

        # 2. Prevent common local alias hostnames
        lowered_host = hostname.lower()
        if lowered_host in {"localhost", "127.0.0.1", "0.0.0.0", "::1"}:
            raise SSRFSecurityException(f"Targeting localhost or loopback '{hostname}' is prohibited.")

        # 3. Resolve DNS and inspect resolved IP addresses
        try:
            # Check if host is already an IP literal
            ip_obj = ipaddress.ip_address(hostname)
            cls._check_ip_safety(ip_obj)
        except ValueError:
            # It's a hostname, resolve via getaddrinfo
            try:
                addr_info = socket.getaddrinfo(hostname, None, proto=socket.IPPROTO_TCP)
            except socket.gaierror as err:
                raise SSRFSecurityException(f"Failed to resolve host '{hostname}': {err}")

            if not addr_info:
                raise SSRFSecurityException(f"No IP addresses resolved for '{hostname}'.")

            for item in addr_info:
                sockaddr = item[4]
                ip_str = sockaddr[0]
                try:
                    ip_obj = ipaddress.ip_address(ip_str)
                    cls._check_ip_safety(ip_obj)
                except ValueError:
                    raise SSRFSecurityException(f"Invalid resolved IP '{ip_str}'.")

        return True, "URL is safe"

    @classmethod
    def _check_ip_safety(cls, ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> None:
        """Checks if an IP falls into any disallowed network."""
        if ip.is_loopback:
            raise SSRFSecurityException(f"Loopback IP address '{ip}' is blocked.")
        if ip.is_private:
            raise SSRFSecurityException(f"Private IP address '{ip}' is blocked.")
        if ip.is_link_local:
            raise SSRFSecurityException(f"Link-local IP address '{ip}' is blocked.")
        if ip.is_multicast:
            raise SSRFSecurityException(f"Multicast IP address '{ip}' is blocked.")
        if ip.is_reserved:
            raise SSRFSecurityException(f"Reserved IP address '{ip}' is blocked.")
        if ip.is_unspecified:
            raise SSRFSecurityException(f"Unspecified IP address '{ip}' is blocked.")

        for network in DISALLOWED_NETWORKS:
            if ip in network:
                raise SSRFSecurityException(
                    f"IP address '{ip}' is in blocked network range '{network}'."
                )
