const vndPrice = (price) => {
  const priceFormat = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);

  return priceFormat.replace(/\./g, ",");
};

module.exports = vndPrice;
