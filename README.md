# 龙零产品数据库 (Long Ling Product Database)

这是一个基于 React + Firebase 的全功能产品管理系统。

## 功能特点

- **产品管理**：支持新增、编辑、删除、复制产品。
- **子产品支持**：每个产品可设置可选的子产品名称。
- **唯一编号**：自动校验产品编号的唯一性。
- **多级权限**：支持管理员 (Admin) 和 浏览者 (Viewer) 角色。
- **汇率转换**：实时获取 USD 到 CNY 的汇率，自动计算海外售价。
- **导出功能**：支持自定义栏位导出 Excel 或 CSV。
- **用户管理**：管理员可直接在系统内创建和管理其他用户。

## 部署说明 (GitHub Pages)

本项目已配置 GitHub Actions 自动部署。

### 1. 推送代码
将代码推送到 GitHub 仓库的 `main` 分支。

### 2. 开启 Pages 服务
1. 进入 GitHub 仓库设置 (**Settings**)。
2. 点击左侧菜单的 **Pages**。
3. 在 **Build and deployment** > **Branch** 下，选择 `gh-pages` 分支，并点击 **Save**。

### 3. Firebase 配置
应用会自动读取根目录下的 `firebase-applet-config.json`。请确保该文件包含正确的 Firebase 配置。

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```
