FROM node:6
WORKDIR /usr/src/app
RUN npm install
COPY . .
EXPOSE 1337
ENTRYPOINT [ "node", "index.js" ]

