# 第一階段：使用最新的 Node.js 22 (Alpine 輕量版) 來打包程式碼
FROM node:22-alpine as builder

WORKDIR /app

# 複製 package.json 並安裝套件
COPY package*.json ./
RUN npm install

# 複製所有原始碼並執行打包
COPY . .
RUN npm run build

# 第二階段：使用輕量級的 Nginx 伺服器來運行網站
FROM nginx:alpine

# 把剛剛打包好的 dist 資料夾，放到 Nginx 的對應位置
COPY --from=builder /app/dist /usr/share/nginx/html

# 開放 80 埠
EXPOSE 80

# 啟動 Nginx
CMD ["nginx", "-g", "daemon off;"]