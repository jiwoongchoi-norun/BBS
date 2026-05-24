function cleanText(value, maxLength) {
  var text = (value || '').trim();

  if (maxLength && text.length > maxLength) {
    return '';
  }

  return text;
}

function isValidNumber(value) {
  var numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0;
}

function toValidNumber(value) {
  return isValidNumber(value) ? Number(value) : null;
}

module.exports = {
  cleanText: cleanText,
  isValidNumber: isValidNumber,
  toValidNumber: toValidNumber
};
