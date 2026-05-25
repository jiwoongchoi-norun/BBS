function renderForbidden(res) {
  // 권한 없는 수정/삭제/다운로드 요청에 공통 403 응답을 반환한다.
  res.status(403);
  res.send('권한이 없습니다.');
}

function renderBadRequest(res, message) {
  // 번호나 입력값이 잘못된 요청에 공통 400 응답을 반환한다.
  res.status(400);
  res.send(message || '잘못된 요청입니다.');
}

module.exports = {
  renderForbidden: renderForbidden,
  renderBadRequest: renderBadRequest
};
