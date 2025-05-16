const constructKey = (
    email,
    service,
    query,
    postCount
) => {
    return `${service}_${email}_${query}_${postCount}`;
};

module.exports = { constructKey }