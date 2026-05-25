function asyncHandler(handler) {
  // async 라우트에서 발생한 예외를 Express error middleware로 넘기는 공통 래퍼다.
  return function (req, res, next) {
    return Promise.resolve(handler(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
