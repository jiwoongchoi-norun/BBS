var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var multer = require('multer');

var uploadDir = path.join(__dirname, '..', '..', 'uploads', 'bbs');
var maxUploadSize = 10 * 1024 * 1024;

// 확장자와 MIME 타입을 함께 확인해 단순 확장자 위장 업로드를 줄인다.
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
  // 최초 실행 환경에서도 업로드 경로가 없어서 실패하지 않도록 생성한다.
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
  // 브라우저/OS 조합에 따라 깨질 수 있는 원본명을 UTF-8 기준으로 복원한다.
  if (!file || !file.originalname) {
    return '';
  }

  return path.basename(Buffer.from(file.originalname, 'latin1').toString('utf8'));
}

function getUploadErrorMessage(err) {
  // multer 오류 코드를 사용자에게 보여줄 수 있는 메시지로 바꾼다.
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
  // DB에 저장된 파일명도 다시 basename 처리해 uploads/bbs 밖으로 나가지 못하게 한다.
  var safeName = path.basename(saveName || '');
  var uploadRoot = path.resolve(uploadDir);
  var filePath = path.resolve(uploadRoot, safeName);

  // 경로 조작 방지: 최종 경로는 반드시 uploads/bbs 하위 파일이어야 한다.
  if (!safeName || safeName !== saveName || filePath.indexOf(uploadRoot + path.sep) !== 0) {
    return '';
  }

  return filePath;
}

function deleteStoredFile(saveName) {
  // DB 트랜잭션 이후 실제 파일을 정리할 때 사용한다. 삭제 실패는 로그만 남긴다.
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
  // SELECT SAVE_FILENAME 결과 배열을 받아 여러 첨부파일을 순차 정리한다.
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
