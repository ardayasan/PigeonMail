"""
smtp/client.py — Internal SMTP client for routing API sends through the SMTP server.

Uses Python's smtplib to send messages to our own SMTP server (localhost:2525).
This ensures all sends go through the real SMTP protocol and appear in logs.
"""

import logging
import smtplib
import socket
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from email.utils import formatdate, make_msgid
from typing import Optional

import config

logger = logging.getLogger(__name__)


def send_via_smtp(
    from_addr: str,
    to_addrs: list[str],
    subject: str,
    body: str,
    attachments: Optional[list[dict]] = None,
) -> None:
    """
    Send an email via our local SMTP server.
    
    attachments: list of dicts with keys: filename, content_type, data (bytes)
    Raises smtplib.SMTPException or OSError on failure.
    """
    # Build MIME message
    if attachments:
        msg = MIMEMultipart()
        msg.attach(MIMEText(body, "plain", "utf-8"))
        for att in attachments:
            part = MIMEBase(*att["content_type"].split("/", 1))
            part.set_payload(att["data"])
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                "attachment",
                filename=att["filename"],
            )
            msg.attach(part)
    else:
        msg = MIMEText(body, "plain", "utf-8")

    msg["From"] = from_addr
    msg["To"] = ", ".join(to_addrs)
    msg["Subject"] = subject
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain=config.LOCAL_DOMAIN)
    msg["MIME-Version"] = "1.0"

    raw = msg.as_string()

    logger.info(
        "SMTP-CLIENT: sending from=%s to=%s subject=%r via localhost:%d",
        from_addr, to_addrs, subject, config.SMTP_PORT,
    )

    with smtplib.SMTP("127.0.0.1", config.SMTP_PORT, timeout=10) as smtp:
        smtp.ehlo(config.LOCAL_DOMAIN)
        smtp.sendmail(from_addr, to_addrs, raw)

    logger.info(
        "SMTP-CLIENT: delivered from=%s to=%s",
        from_addr, to_addrs,
    )
