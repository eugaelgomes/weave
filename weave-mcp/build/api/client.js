export class WeaveApiClient {
    baseUrl;
    token;
    constructor() {
        this.baseUrl = process.env.WEAVE_API_URL || "http://localhost:4000/api/v1";
        this.token = process.env.WEAVE_API_TOKEN || "";
        if (!this.token) {
            console.warn("Aviso: WEAVE_API_TOKEN não está definido no ambiente. Chamadas à API podem falhar.");
        }
    }
    getHeaders() {
        return {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
        };
    }
    async get(path, params) {
        const url = new URL(`${this.baseUrl}${path}`);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value)
                    url.searchParams.append(key, value);
            });
        }
        const response = await fetch(url.toString(), {
            method: "GET",
            headers: this.getHeaders(),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Falha na requisição GET ${path}: ${response.status} - ${errorText}`);
        }
        return response.json();
    }
    async post(path, body) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Falha na requisição POST ${path}: ${response.status} - ${errorText}`);
        }
        return response.json();
    }
    async put(path, body) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: "PUT",
            headers: this.getHeaders(),
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Falha na requisição PUT ${path}: ${response.status} - ${errorText}`);
        }
        return response.json();
    }
}
export const weaveClient = new WeaveApiClient();
