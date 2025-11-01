// __webpack_public_path__ 是webpack提供的一个动态设置publicPath的全局变量
// 在qiankun中，我们需要将其设置为主应用分配的路径
if (window.__POWERED_BY_QIANKUN__) {
  // eslint-disable-next-line no-undef
  __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
}
