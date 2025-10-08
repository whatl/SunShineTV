# SunShineTV Docker 部署说明

## 快速部署

1. **配置环境变量**
   ```bash
   cp .env.example .env
   vi .env  # 修改配置
   ```

2. **启动服务**
   ```bash
   ./docker-deploy.sh start
   ```

3. **访问应用**
   ```
   http://服务器IP:3000
   ```

## 管理命令

```bash
./docker-deploy.sh start    # 启动
./docker-deploy.sh stop     # 停止
./docker-deploy.sh restart  # 重启
./docker-deploy.sh logs     # 查看日志
./docker-deploy.sh rebuild  # 重新构建
./docker-deploy.sh status   # 查看状态
```

## 服务说明

- **app**: SunShineTV 主应用 (端口 3000)
- **kvrocks**: 数据存储 (端口 6666)

## 数据备份

```bash
# 备份
docker run --rm -v sunshinetv_kvrocks-data:/data -v $(pwd):/backup alpine tar czf /backup/kvrocks-backup.tar.gz -C /data .

# 恢复
docker run --rm -v sunshinetv_kvrocks-data:/data -v $(pwd):/backup alpine tar xzf /backup/kvrocks-backup.tar.gz -C /data
```
