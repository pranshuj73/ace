export const config = {
  api: {
    domain: "ace-api.pranshuj73.workers.dev",
    protocol: "https" as const,
    get baseUrl() {
      return `${this.protocol}://${this.domain}`;
    },
  },
} as const;
