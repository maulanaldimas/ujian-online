import { defineRailway, project, service } from "railway/iac";

export const partial = "ujian-app";

export default defineRailway(() => {
  const web = service("ujian-app", {
    healthcheck: "/api/auth/me",
    source: {
      type: "github",
      repo: "maulanaldimas/ujian-online",
    },
    variables: {
      DATABASE_URL: { value: "${{Postgres.DATABASE_URL}}" },
      JWT_SECRET: { value: "${{JWT_SECRET}}" },
    },
  });

  return project("ujian-online", {
    resources: [web],
  });
});
