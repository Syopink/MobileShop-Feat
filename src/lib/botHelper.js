const productModel = require("../apps/models/product");
const Training = require("../apps/models/training");

async function getBotReply(message) {
  message = message.toLowerCase().trim();

  const training = await Training.findOne({
    question: { $regex: message, $options: "i" },
  });
  if (training) return training.answer;

  let budget = null;
  const budgetRegex =
    /(\d{1,3}(?:[\.,]?\d{3})*)\s*(triệu|tr|m|million|vnđ|vnd)?/i;
  const match = message.match(budgetRegex);
  if (match) {
    let num = parseFloat(match[1].replace(/[.,]/g, ""));
    let unit = match[2] ? match[2].toLowerCase() : "";

    if (unit === "triệu" || unit === "tr") num *= 1_000_000;
    else if (unit === "m" || unit === "million") num *= 1_000_000;
    budget = num;
  }

  const stopWords =
    /(mua|giá|điện thoại|smartphone|cần|tư vấn|dưới|trên|khoảng)/gi;
  let keywords = message.replace(budgetRegex, "").replace(stopWords, "").trim();

  let query = { is_delete: false };
  if (budget) {
    if (/dưới|thấp hơn/i.test(message)) query.price = { $lte: budget };
    else if (/trên|cao hơn/i.test(message)) query.price = { $gte: budget };
    else query.price = { $lte: budget };
  }
  if (keywords) query.name = { $regex: keywords, $options: "i" };

  const products = await productModel
    .find(query)
    .sort(budget ? { price: -1 } : {})
    .limit(5);

  if (products.length === 0 && keywords) {
    const fallbackProducts = await productModel
      .find({ is_delete: false, name: { $regex: keywords, $options: "i" } })
      .limit(5);
    if (fallbackProducts.length > 0) {
      let reply =
        "Mình không tìm thấy sản phẩm theo ngân sách bạn nhập, nhưng có thể bạn quan tâm:\n\n";
      fallbackProducts.forEach((p) => {
        reply += `• ${p.name}\n  Giá: ${p.price.toLocaleString()}đ\n  ${
          p.status || "Còn hàng"
        }\n\n`;
      });
      return reply;
    }
  }

  if (products.length > 0) {
    let reply = budget
      ? `Với ngân sách khoảng ${budget.toLocaleString()}đ, mình gợi ý các sản phẩm sau:\n\n`
      : "Mình tìm thấy những sản phẩm phù hợp:\n\n";

    products.forEach((p) => {
      reply += `• ${p.name}\n  Giá: ${p.price.toLocaleString()}đ\n  ${
        p.status || "Còn hàng"
      }\n  ${p.promotion ? "Khuyến mãi: " + p.promotion + "\n" : ""}${
        p.warranty ? "Bảo hành: " + p.warranty + "\n" : ""
      }${p.accessories ? "Phụ kiện: " + p.accessories + "\n" : ""}\n`;
    });
    return reply;
  }

  return "Xin lỗi, mình chưa hiểu. Bạn có thể hỏi về sản phẩm khác hoặc dịch vụ của shop.";
}

module.exports = { getBotReply };
