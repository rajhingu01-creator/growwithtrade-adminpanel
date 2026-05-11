module.exports = {
  apps: [
    {
      name: 'tradewithgrow-main',
      cwd: '/var/www/tradewithgrow',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      time: true,
    },
    {
      name: 'tradewithgrow-support',
      cwd: '/var/www/tradewithgrow/twg-support',
      script: 'server.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      time: true,
    },
  ],
};
