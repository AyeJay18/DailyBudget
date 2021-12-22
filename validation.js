const Joi = require('joi');

//Register Validation
const registerValidation = data => {
    const schema = Joi.object({
        name: Joi.string()
            .min(6)
            .required(),
        email: Joi.string()
            .min(6)
            .required()
            .email(),
        password: Joi.string()
            .min(6)
            .required()
    });
    return schema.validate(data);
};

//Profile Validation
const profileValidation = data => {
    const schema = Joi.object({
        name: Joi.string()
            .min(6)
            .required(),
        email: Joi.string()
            .min(6)
            .required()
            .email(),
        password: Joi.string()
            .min(6)
    });
    return schema.validate(data);
};

//Login Validation
const loginValidation = data => {
    const schema = Joi.object({
        email: Joi.string()
            .min(6)
            .required()
            .email(),
        password: Joi.string()
            .min(6)
            .required()
    });
    return schema.validate(data);
};

const budgetValidation = data => {
    const schema = Joi.object({
        name: Joi.string()
            .min(1)
            .required()
            .max(255),
        recurringAmount: Joi.number()
            .positive()
            .precision(2),
        recurringType: Joi.string()
            .required(),
        recurringCustom: Joi.array()
    });
    return schema.validate(data);
}

const transactionValidation = data => {
    const schema = Joi.object({
        name: Joi.string()
            .min(1)
            .required()
            .max(255),
        amount: Joi.number()
            .precision(2)
    });
    return schema.validate(data);
}

const uuidValidation = data => {
    const schema = Joi.object({
        budgetId: Joi.string()
            .alphanum()
            .min(24)
            .max(24),
        transactionId: Joi.string()
            .alphanum()
            .min(24)
            .max(24)
    });
    return schema.validate(data);
}

module.exports.registerValidation = registerValidation;
module.exports.loginValidation = loginValidation;
module.exports.budgetValidation = budgetValidation;
module.exports.transactionValidation = transactionValidation;
module.exports.uuidValidation = uuidValidation;
module.exports.profileValidation = profileValidation;
