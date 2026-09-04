from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import time


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            payload = b'{"status":"UP"}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        if self.path != "/v1/chat/completions":
            self.send_response(404)
            self.end_headers()
            return

        length = int(self.headers.get("Content-Length", "0"))
        body = json.loads(self.rfile.read(length) or b"{}")
        model = body.get("model", "gpt-ci-smoke")

        if body.get("stream"):
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "close")
            self.end_headers()

            chunks = [
                {"model": model, "choices": [{"delta": {"content": "CI stream "}, "finish_reason": None}]},
                {"model": model, "choices": [{"delta": {"content": "smoke test passed"}, "finish_reason": None}]},
                {"model": model, "choices": [{"delta": {}, "finish_reason": "stop"}]},
            ]
            for chunk in chunks:
                payload = f"data: {json.dumps(chunk)}\n\n".encode()
                self.wfile.write(payload)
                self.wfile.flush()
                time.sleep(0.05)
            self.wfile.write(b"data: [DONE]\n\n")
            self.wfile.flush()
            self.close_connection = True
            return

        response = {
            "id": "chatcmpl-ci-smoke",
            "object": "chat.completion",
            "model": model,
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": "CI chat smoke test passed"},
                "finish_reason": "stop"
            }]
        }
        payload = json.dumps(response).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format, *args):
        pass


HTTPServer(("127.0.0.1", 18080), Handler).serve_forever()
