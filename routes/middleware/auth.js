function requireLogin(req, res) {
  // 로그인 필수 라우트에서 세션 사용자 여부를 확인하고, 없으면 로그인 화면으로 보낸다.
  if (!req.session.user) {
    if (req.flashMessage) {
      req.flashMessage('warning', '로그인이 필요한 기능입니다.');
    }
    res.redirect('/bbs/login');
    return false;
  }
  return true;
}

function requireAdmin(req, res) {
  if (!requireLogin(req, res)) {
    return false;
  }

  if (req.session.user.role !== 'ADMIN') {
    res.status(403);
    res.send('관리자 권한이 필요합니다.');
    return false;
  }

  return true;
}

function requireActiveUser(req, res) {
  if (!requireLogin(req, res)) {
    return false;
  }

  if (req.session.user.status === 'SUSPENDED') {
    if (req.flashMessage) {
      req.flashMessage('danger', '정지된 계정은 쓰기 기능을 사용할 수 없습니다.');
    }
    res.redirect('/bbs/myinfo');
    return false;
  }

  return true;
}

module.exports = {
  requireLogin: requireLogin,
  requireActiveUser: requireActiveUser,
  requireAdmin: requireAdmin
};
