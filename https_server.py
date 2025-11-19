import http.server
import ssl
import socketserver

PORT = 8443
IP = "192.168.50.230"  # local IP of your Mac (used for informational message)

handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), handler) as httpd:
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile="cert.pem", keyfile="key.pem")
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    print(f"Serving HTTPS on https://{IP}:{PORT} (CTRL+C to stop)")
    httpd.serve_forever()
