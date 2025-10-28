Page({
  data: {
    // 如果图片数据是动态获取的，可以在这里定义一个数组
    // photoList: [
    //   { id: 1, src: "cloud://...", caption: "团建活动" },
    //   { id: 2, src: "cloud://...", caption: "团队凝聚" },
    //   // ... 其他图片数据
    // ]
  },

  onLoad: function (options) {
    // 页面加载时执行
    // 可以在这里获取图片数据
  },

  // 您可以添加点击图片放大的函数
  // previewImage: function(e) {
  //   const currentUrl = e.currentTarget.dataset.src;
  //   wx.previewImage({
  //     current: currentUrl, // 当前显示图片的http链接
  //     urls: this.data.photoList.map(item => item.src) // 需要预览的图片http链接列表
  //   })
  // }
})