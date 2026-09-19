# 雨后菌语启动视觉

原创矢量：暖金色菌盖、嫩叶、雨滴；森林绿背景。图形仅作品牌装饰，不用于物种鉴别。

游戏内素材加载与场景准备已接入，不增加固定等待或远程图片请求；加载失败仍返回首页重试。微信原生启动页、后台头像尚未修改。

后台头像候选文件：assets/brand/rainy-mushroom-icon-512.png。另提供1024、256、64像素及SVG源文件。矢量数据源为 js/data/brandMark.js，生成脚本为 scripts/generate-brand.mjs（需要 sharp）。

本地设计预览：scripts/cocos-preview.html?loadingPreview=boot，场景加载预览用 loadingPreview=scene。仅浏览器诊断参数会停留展示；正常游戏不暂停。

验证：TypeScript、265项自动测试、243项编译后回归检查通过；检查375×812与320×568布局。网页、微信均已构建；手机启动效果仍需真机验收。
