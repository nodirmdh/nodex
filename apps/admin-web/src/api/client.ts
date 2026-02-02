type ApiClientOptions = {
  baseUrl?: string;
};

export class ApiClient {
  private baseUrl: string;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "http://localhost:3000";
  }

  async getVendors() {
    return this.request("/admin/vendors");
  }

  async getOrders() {
    return this.request("/admin/orders");
  }

  async getPromoCodes() {
    return this.request("/admin/promo-codes");
  }

  async getPromotions() {
    return this.request("/admin/promotions");
  }

  private async request(path: string) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
  }
}
