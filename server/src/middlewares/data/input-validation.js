const { body } = require("express-validator");

const inputValidation = () => {
  return [
    body("name")
      .trim()
      .matches(/^[\p{L}\s]+$/u)
      .withMessage("Apenas letras e espaços são permitidos.")
      .isLength({ min: 1, max: 100 })
      .withMessage("O nome não pode estar vazio ou ser muito longo.")
      .escape(),

    body("username")
      .trim()
      .matches(/^[a-zA-Z0-9._-]+$/)
      .withMessage("Apenas letras, números, ., - ou _ são permitidos.")
      .isLength({ min: 6, max: 18 })
      .withMessage("O nome de usuário deve ter entre 6 e 18 caracteres.")
      .toLowerCase()
      .escape(),

    body("email")
      .trim()
      .isEmail()
      .withMessage("E-mail inválido.")
      .normalizeEmail(),

    body("password")
      .isStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 0,
      })
      .withMessage(
        "A senha deve conter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas e números."
      ),
  ];
};

const loginValidation = () => {
  return [
    body("login")
      .trim()
      .notEmpty()
      .withMessage("Usuário ou e-mail é obrigatório.")
      .isLength({ min: 3, max: 255 })
      .withMessage("Usuário ou e-mail inválido.")
      .escape(),

    body("password")
      .trim()
      .notEmpty()
      .withMessage("Senha é obrigatória.")
      .isLength({ min: 1 })
      .withMessage("Senha inválida."),
  ];
};

module.exports = {
  inputValidation,
  loginValidation,
};
