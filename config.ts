export const config = {
  api: {
    domain: "ace.prnsh.site",
    protocol: "https" as const,
    get baseUrl() {
      return `${this.protocol}://${this.domain}`;
    },
  },
} as const;
