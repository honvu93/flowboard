module.exports = {
  apps: [
    {
      name: "flowboard-api",
      namespace: "flowboard",
      script: "src/infrastructure/http/server.js",
      env: {
        NODE_ENV: "production",
        PORT: "6400",
        DATABASE_URL: "postgresql://veoup_app:Codex2026Pg!@localhost:5432/flowboard?connection_limit=10",
        REDIS_URL: "redis://localhost:6379",
      }
    },
    {
      name: "flowboard-frontend",
      namespace: "flowboard",
      script: "node_modules/next/dist/bin/next",
      cwd: "/opt/projects/flowboard/current/web",
      args: "start -p 6401",
      env: {
        NODE_ENV: "production",
        PORT: "6401",
        DATABASE_URL: "postgresql://veoup_app:Codex2026Pg!@localhost:5432/flowboard?connection_limit=10",
        SITE_URL: "https://flowboard.autoveoup.com",
        NEXT_PUBLIC_SITE_URL: "https://flowboard.autoveoup.com",
      }
    },
    {
      name: "flowboard-worker",
      namespace: "flowboard",
      script: "src/workers/flow-operation-worker.js",
      env: {
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://veoup_app:Codex2026Pg!@localhost:5432/flowboard?connection_limit=10",
        REDIS_URL: "redis://localhost:6379",
      }
    }
  ]
};
