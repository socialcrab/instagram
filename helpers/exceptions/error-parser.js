// Konstanta SERVICE untuk layanan instagram
const SERVICE = {
  PROFILE: 'instagram-profile',
  HASHTAG: 'instagram-hashtag',
};

// Konstanta REPORT_STATUS untuk status laporan
const REPORT_STATUS = {
  REQUESTED: 'requested',
  QUEUED: 'queued',
  PROCESSING: 'processing',
  FINISH: 'finish',
  CLOSED: 'closed',
  NOT_FOUND: 'not-found',
  PRIVATE: 'private',
  FORBIDDEN: 'forbidden',
  BAD_GATEWAY: 'bad-gateway',
  INTERNAL_ERROR: 'internal-error',
};

// Fungsi untuk memetakan status laporan
const reportStatusMapper = (status) => {
  const statusMap = {
    requested: REPORT_STATUS.REQUESTED,
    queued: REPORT_STATUS.QUEUED,
    processing: REPORT_STATUS.PROCESSING,
    finish: REPORT_STATUS.FINISH,
    closed: REPORT_STATUS.CLOSED,
    'not-found': REPORT_STATUS.NOT_FOUND,
    private: REPORT_STATUS.PRIVATE,
    forbidden: REPORT_STATUS.FORBIDDEN,
    'bad-gateway': REPORT_STATUS.BAD_GATEWAY,
  };

  return statusMap[status] || REPORT_STATUS.INTERNAL_ERROR;
};

// Export konstanta dan fungsi
module.exports = {
  SERVICE,
  REPORT_STATUS,
  reportStatusMapper,
};
