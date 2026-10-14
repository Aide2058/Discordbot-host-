FROM node:22-slim
WORKDIR /app
RUN npm i discord.js
COPY runner.js .
EXPOSE 8080
CMD ["node", "runner.js"]
