import http.server
import socketserver
os.chdir(".")
PORT = 8000
Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as http:
    print("server at port", PORT)
    http.serve_forever()
