function cleanText(value, maxLength) {
  // 모든 라우트에서 문자열 입력을 trim하고 길이 제한을 같은 방식으로 적용한다.
  var text = (value || '').trim();

  // 지정 길이를 넘기면 빈 값으로 돌려 라우트의 필수값 검증 흐름을 재사용한다.
  if (maxLength && text.length > maxLength) {
    return '';
  }

  return text;
}

function isValidNumber(value) {
  // 게시글/댓글/파일 번호는 양의 정수만 유효하게 본다.
  var numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0;
}

function toValidNumber(value) {
  // 유효하지 않은 번호는 null로 통일해 라우트에서 if (!value)로 처리한다.
  return isValidNumber(value) ? Number(value) : null;
}

module.exports = {
  cleanText: cleanText,
  isValidNumber: isValidNumber,
  toValidNumber: toValidNumber
};
