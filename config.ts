export const config = {
  api: {
    domain: "upskill.prnsh.site",
    protocol: "https" as const,
    get baseUrl() {
      return `${this.protocol}://${this.domain}`;
    },
  },
} as const;
