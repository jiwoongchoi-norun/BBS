var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var multer = require('multer');

var uploadDir = path.join(__dirname, '..', '..', 'uploads', 'bbs');
var maxUploadSize = 10 * 1024 * 1024;
var allowedFileTypes = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.pdf': ['application/pdf'],
  '.txt': ['text/plain'],
  '.zip': ['application/zip', 'application/x-zip-compressed'],
  '.hwp': ['application/x-hwp', 'application/haansofthwp', 'application/octet-stream'],
  '.hwpx': ['application/zip', 'application/octet-stream'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
};

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

var upload = multer({
  storage: multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, uploadDir);
    },
    filename: function (_req, file, cb) {
      var ext = path.extname(file.originalname || '').toLowerCase();
      var saveName = Date.now() + '-' + crypto.randomBytes(8).toString('hex') + ext;
      cb(null, saveName);
    }
  }),
  limits: {
    fileSize: maxUploadSize,
    files: 1
  },
  fileFilter: function (_req, file, cb) {
    var originalName = path.basename(file.originalname || '');
    var ext = path.extname(originalName).toLowerCase();
    var allowedMimes = allowedFileTypes[ext] || [];

    if (!ext || allowedMimes.length < 1 || allowedMimes.indexOf(file.mimetype) < 0) {
      cb(new Error('허용하지 않는 파일 형식입니다.'));
      return;
    }

    cb(null, true);
  }
});

function getUploadOriginalName(file) {
  if (!file || !file.originalname) {
    return '';
  }

  return path.basename(Buffer.from(file.originalname, 'latin1').toString('utf8'));
}

function getUploadErrorMessage(err) {
  if (!err) return '';
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return '첨부 파일은 10MB 이하만 업로드할 수 있습니다.';
  }
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_COUNT') {
    return '첨부 파일은 1개만 업로드할 수 있습니다.';
  }
  return err.message || '첨부 파일 업로드에 실패했습니다.';
}

function resolveStoredUploadPath(saveName) {
  var safeName = path.basename(saveName || '');
  var uploadRoot = path.resolve(uploadDir);
  var filePath = path.resolve(uploadRoot, safeName);

  if (!safeName || safeName !== saveName || filePath.indexOf(uploadRoot + path.sep) !== 0) {
    return '';
  }

  return filePath;
}

function deleteStoredFile(saveName) {
  var filePath = resolveStoredUploadPath(saveName);

  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('file delete failed : ' + err.message);
    }
  }
}

function deleteStoredFiles(fileRows) {
  for (var i = 0; i < fileRows.length; i++) {
    deleteStoredFile(fileRows[i][0]);
  }
}

module.exports = {
  upload: upload,
  getUploadOriginalName: getUploadOriginalName,
  getUploadErrorMessage: getUploadErrorMessage,
  resolveStoredUploadPath: resolveStoredUploadPath,
  deleteStoredFile: deleteStoredFile,
  deleteStoredFiles: deleteStoredFiles
};
