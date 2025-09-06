FROM node:18-slim

WORKDIR /usr/src

COPY package*.json ./
RUN npm install

COPY src/ ./src/

CMD ["npm", "start"]