import debounce from '../utils/debounce';
import throttle from '../utils/throttle';

// eslint-disable-next-line no-undef
Component({
  options: {
    pureDataPattern: /^/,
  },
  properties: {
    active: { type: Number, value: 0 },
    // 【新增】自动播放属性，默认为 false
    autoplay: { type: Boolean, value: false },
    // 【新增】自动播放间隔，默认为 3000ms
    interval: { type: Number, value: 3000 },
  },
  data: {},
  // 【新增】自动播放定时器句柄
  autoPlayTimer: null, 
  
  methods: {
    // 【新增】启动自动播放
    startAutoPlay() {
      if (!this.properties.autoplay) return;
      
      this.stopAutoPlay(); // 先清除旧的定时器
      
      this.autoPlayTimer = setInterval(() => {
        // 调用已有的滑动方法，false 为切换到下一张
        this.swiper(false); 
      }, this.properties.interval);
    },

    // 【新增】停止自动播放
    stopAutoPlay() {
      if (this.autoPlayTimer) {
        clearInterval(this.autoPlayTimer);
        this.autoPlayTimer = null;
      }
    },

    init() {
      const items = this.getRelationNodes('../tower-swiper-item/index');
      this.setData({ items });

      if (items.length > 0) {
        items[0].createSelectorQuery()
          .select('.tower-swiper-item')
          .boundingClientRect((result) => {
            this.setData({ height: result.height });
          }).exec();
        this.mount();
        // 【调用】初始化完成后启动自动播放
        this.startAutoPlay(); 
      }
    },

    onTapItem(target) {
      // 【新增】用户手动点击时，停止自动播放
      this.stopAutoPlay();
      
      const index = this.data.items.indexOf(target);
      if (index !== this.data.active) {
        this.setData({ active: index });
        this.mount();
      }
    },

    mount() {
      const { items, active } = this.data;
      const l = items.length;
      const odd = l % 2;
      const half = Math.floor(items.length / 2);
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < items.length; i++) {
        const item = items[(half + active + i + odd) % l];
        const zIndex = half - Math.abs(half - i) + odd;
        item.setZIndex(zIndex);
        item.setLeft(i - half);
        item.setScale(1 - (half - zIndex) / 10);
      }
    },
    swiper(isLeft) {
      const offset = isLeft ? -1 : 1;
      const { items, active } = this.data;
      this.setData({ active: (active + offset + items.length) % items.length });
      this.mount();
    },

    onTouchStart(e) {
      // 【新增】用户开始手动滑动时，停止自动播放
      this.stopAutoPlay();
      
      const touch = e.touches[0];
      this.touchStart = {
        timestamp: e.timeStamp,
        clientX: touch.clientX,
        clientY: touch.clientY,
      };
    },

    onTouchMove(e) {
      const touch = e.touches[0];
      this.touchEnd = {
        timestamp: e.timeStamp,
        clientX: touch.clientX,
        clientY: touch.clientY,
      };
    },
    onTouchEnd() {
      if (!this.touchStart || !this.touchEnd) { return; }

      const deltaX = this.touchStart.clientX - this.touchEnd.clientX;
      const deltaY = this.touchStart.clientY - this.touchEnd.clientY;
      if (Math.abs(deltaX) > Math.abs(deltaY) * 2) {
        this.swiper(deltaX < 0);
      }
      this.touchStart = null;
      this.touchEnd = null;
      
      // 【新增】滑动结束后，重新启动自动播放 
      this.startAutoPlay(); 
    },
  },
  relations: {
    '../tower-swiper-item/index': {
      type: 'child',
      linked() {
        this.init();
      },
      linkChanged() {
        this.init();
      },
      unlinked() {
        this.init();
        // 【新增】子组件卸载时，停止自动播放
        this.stopAutoPlay();
      },
    },
  },
  lifetimes: {
    created() {
      this.init = debounce(this, this.init);
      this.onSwiper = throttle(this, this.onSwiper, 500);
      this.onTouchMove = throttle(this, this.onTouchMove, 16);
    },
    // 【新增】在组件被移除时停止自动播放
    detached() {
      this.stopAutoPlay();
    }
  },
});