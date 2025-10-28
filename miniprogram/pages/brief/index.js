Page({
  data: {
    // 页面数据可以在这里定义，但对于静态页面，保持简洁即可
    companyInfo: {
      profile: `浙江泰鸿万立科技股份有限公司，原名浙江泰鸿机电有限公司。公司成立于 2005 年，总部位于浙江省台州市台州湾新区，是一家集研发、生产、销售、服务为一体的综合性汽车零部件配套企业。
        
公司专业生产汽车冲压焊接结构件及小总成功能件（包括踏板、手刹、防撞梁、铰链、限位器、油箱门等），产品直接配套国内整车厂，包括新能源汽车、乘用车以及部分商用车。公司目前是吉利、长城、沃尔沃、领克、上汽、通用五菱、广汽、福特、蔚来、理想等国内外知名汽车制造商一级配套供应商。

公司一直秉承“创新发展”的理念，深度耕耘汽配行业，目前为“国家高新技术企业”、“浙江省科技型中小企业”、“浙江省信用示范企业”、“台州市瞪羚企业”、“台州市创新示范企业”、“台州市专利示范企业”，获得过“政府质量奖”；蝉联多年台州经济开发区/台州湾新区“十强工业企业”、“十佳工业企业”；公司建有“省级高新技术企业研发中心”、“省级技术中心”、“省级研究院”，公司实验室通过了国家 CNAS 实验室认证，公司拥有研发专利近一百件；多年来多次被吉利、长城、福特等主机厂授予“年度优秀供应商”、“质量提升奖”、“管理创新奖”、“开发协议奖”、“忠诚奖”等荣誉奖项。

公司目前建有八个生产基地，分布于：台州湾新区、山东济南、河北保定、山西晋中、浙江湖州、上海浦东。生产设备包含多条大型自动化冲压生产线，多台连续冲、小冲等精密度较高的半自动化冲压设备；拥有自动化焊接机器人工作站，全自动数控机床；激光焊接机等精密加工设备亦有配备。同时公司自有模具事业部，配有专业的模具设计与制造团队，CNC、线切割等各类先进的模具生产加工和检测设备配备齐全，为公司工装、模具、夹具和检具制造及模具改造提供了强有力的保障。

“创新求精、顾客为尊”是公司一直贯彻的质量方针，“零缺陷”是公司持续追求的质量目标。公司是吉利 BBB 核心供应商，通过了福特 Q1 质量管理体系。公司管理及产品通过了 IATF16949 质量管理体系认证、ISO14001 环境管理体系认证、ISO45001 职业健康安全管理体系认证、CNAS 实验室认证、CQC 认证、知识产权管理体系认证。

展望未来，泰鸿公司将本着“做全球汽车零部件领域的领先者”，坚持“以才为本，追求卓越；以质为本、追求完美”核心价值观，为中国汽车工业进步和发展添砖加瓦。`,
      milestones: [
        { year: '2005年', event: '公司成立' },
        { year: '2009年12月', event: '成立济南泰鸿，拓展北方业务' },
        { year: '2015年5月', event: '成立保定泰鸿，扩大长城业务' },
        { year: '2016年10月', event: '台州滨海新厂一期投产' },
        { year: '2017年8月', event: '整合基地资源，完成股改' },
        { year: '2022年7月', event: '上海泰鸿成立' },
        { year: '2025年4月9日', event: '泰鸿上市' },
      ],
      contact: {
        phone: '0576-82887777',
        fax: '0576-82887777',
        email: 'zqb@zjtaihong.com',
        addressOld: '浙江省台州市滨海工业区海丰路1178号（老厂）',
        addressNew: '浙江省台州市滨海工业区海虹大道100号（新厂）',
        copyright: 'Copyright © 2005-2022 浙江泰鸿万立科技股份有限公司 版权所有 浙ICP备2021034771号',
      }
    },
    // 专门用于 WXML 循环渲染的段落数组
    profileParagraphs: [], 
  },

  /**
   * 辅助函数：将长文本按固定字符数和原生换行符分割成段落数组。
   * @param {string} longText - 原始长文本。
   * @param {number} charLimit - 每段的最大字符数（近似值）。
   * @returns {string[]} 分割后的段落数组。
   */
  formatProfileText: function(longText, charLimit = 90) {
    if (!longText) return [];
    
    // 1. 先按原生换行符（如果有）分割成大段
    const majorParagraphs = longText.split(/\r?\n\s*\r?\n/g).filter(p => p.trim().length > 0);
    const result = [];

    majorParagraphs.forEach(majorP => {
      let currentText = majorP.trim().replace(/\r?\n/g, ' '); // 移除段落内的所有换行符
      
      // 2. 将每个大段按字符限制进一步分割
      while (currentText.length > 0) {
        let segment = currentText.substring(0, charLimit);
        
        // 尝试在最后一个句号或逗号处截断，以保持句子完整性
        let idealBreak = segment.lastIndexOf('。');
        if (idealBreak === -1) {
            idealBreak = segment.lastIndexOf('，');
        }

        let breakIndex = (idealBreak > charLimit - 30 && idealBreak !== -1) ? idealBreak + 1 : charLimit;
        
        // 如果剩下的文本小于 charLimit，直接取完
        if (currentText.length <= charLimit) {
            result.push(currentText);
            currentText = '';
        } else {
             // 否则按 breakIndex 截取
            const segmentToAdd = currentText.substring(0, breakIndex);
            result.push(segmentToAdd.trim());
            currentText = currentText.substring(breakIndex).trim();
        }
      }
    });

    return result;
  },

  onLoad: function() {
    // 页面加载时的逻辑
    console.log('公司简介页面加载完成');
    
    // ⭐ 关键：处理长文本并更新 data
    const formattedParagraphs = this.formatProfileText(this.data.companyInfo.profile, 140);
    this.setData({
      profileParagraphs: formattedParagraphs
    });
  },
  
  //... (可以添加如复制联系方式或拨打电话的函数) ...
});
