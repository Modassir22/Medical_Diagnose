FROM node

ENV PORT=3001 \
    MONGODB_URI=mongodb+srv://modassirmallick285:modassirimam@cluster0.rv3bup5.mongodb.net/medical_diagnosis

WORKDIR app/backend

COPY package*.json ./


RUN npm install

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]