function renderForbidden(res) {
  res.status(403);
  res.send('권한이 없습니다.');
}

function renderBadRequest(res, message) {
  res.status(400);
  res.send(message || '잘못된 요청입니다.');
}

module.exports = {
  renderForbidden: renderForbidden,
  renderBadRequest: renderBadRequest
};
