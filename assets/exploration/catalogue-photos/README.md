# 扩展菌物实拍照片

本目录包含28种菌物的56张实拍照片，取自 iNaturalist 的 research-grade 观察记录。逐图作者、照片地址、观察页面、许可链接、加工说明及校验值见 ATTRIBUTION.json。新增照片仅采用 CC BY 或 CC0，未引入 NC 素材。

照片由人工查看候选联系表后选取；第一张展示整体形态，第二张提供不同角度或细节。照片不一定来自同一个体，也不保证呈现文字线索中的全部特征。观察记录中的鉴定是来源平台的结论，不是本项目重新鉴定的结果。

栎迷孔菌在来源平台以 Fomitopsis quercina 收录，旧名 Daedalea quercina 被同义词检索匹配；保留游戏物种ID以兼容存档。核对入口：iNaturalist API /v1/taxa/autocomplete?q=Daedalea%20quercina&all_names=true。

维护流程：导出 EXPANDED_SPECIES 到 /tmp/rainy-catalogue.json；运行 scripts/fetch-catalogue-photos.py 获取候选，逐张查看并编辑 scripts/catalogue-photo-selection.json，再运行 scripts/build-catalogue-photos.py。发布前应以本目录的逐图许可为准。原示意图目录仅保留为历史素材，运行时不再引用。
