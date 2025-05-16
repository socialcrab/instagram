// Definisikan SERVICE sebagai objek dengan dua properti
const SERVICE = Object.freeze({
  PROFILE: "instagram-profile",
  HASHTAG: "instagram-hashtag",
});

// Definisikan REPORT_STATUS sebagai objek dengan berbagai status
const REPORT_STATUS = Object.freeze({
  REQUESTED: "requested",
  QUEUED: "queued",
  PROCESSING: "processing",
  FINISH: "finish",
  CLOSED: "closed",
  NOT_FOUND: "not-found",
  PRIVATE: "private",
  FORBIDDEN: "forbidden",
  BAG_GATEWAY: "bad-gateway",
  INTERNAL_ERROR: "internal-error",
});

// Fungsi untuk memetakan status ke salah satu dari nilai-nilai yang ada di REPORT_STATUS
const reportStatusMapper = (status) => {
  const statusMapping = {
    requested: REPORT_STATUS.REQUESTED,
    queued: REPORT_STATUS.QUEUED,
    processing: REPORT_STATUS.PROCESSING,
    finish: REPORT_STATUS.FINISH,
    closed: REPORT_STATUS.CLOSED,
    "not-found": REPORT_STATUS.NOT_FOUND,
    private: REPORT_STATUS.PRIVATE,
    forbidden: REPORT_STATUS.FORBIDDEN,
    "bad-gateway": REPORT_STATUS.BAG_GATEWAY,
  };

  // Kembalikan status yang sesuai, atau jika tidak ditemukan, kembalikan INTERNAL_ERROR
  return statusMapping[status] || REPORT_STATUS.INTERNAL_ERROR;
};

// Ekspor SERVICE, REPORT_STATUS, dan reportStatusMapper
module.exports = {
  SERVICE,
  REPORT_STATUS,
  reportStatusMapper,
};
