
const express = require('express');
const _ = require('lodash');
const sequelize = require('sequelize');
const Medicine = require('../Entity/Medicine');
const Prescription = require('../Entity/Prescription');
const prescriptionModel = require('../Model/PrescriptionModel');
const medicineModel = require('../Model/medicineModel.js');
const resultCode = require('../Common/ResultCode');
const { respondHtml, respondJson } = require('../Utils/respond');
const router = express.Router();


router.use(function log(req, res, next) {

    var invalid = ['normal', 'doctor']

    if(invalid.includes(req.session.auth)) {
      return res.redirect('back');
    }

    console.log('## [Management] Management started ##');
    next();
});

router.get('/', (req, res, next) => {
    respondHtml(res, 'management', { auth : req.session.auth });
});


router.get('/medicine/excel', async (req, res, next) => {
    const { searchSet, searchText } = req.query;
    let { categoryMain, categorySmall } = req.query;

    categoryMain = categoryMain.trim();
    categorySmall = categorySmall.trim();
    const options = {};
    const conf = {};

    conf.name = "management";
    conf.cols = [
        { caption: '대 분류', type: 'string' },
        { caption: '소 분류', type: 'string' },
        { caption: '약 품명', type: 'string' },
        { caption: '성분명 및 함량', type: 'string' },
        { caption: '포장 단위', type: 'number' },
        { caption: '재고량', type: 'number' },
        { caption: '용량 / 용법', type: 'string' },
        { caption: '약효', type: 'string' },
        { caption: '활성', type: 'string' },
    ];
    options.where = {};
    options.attributes = [
        'primaryCategory', 'secondaryCategory', 'name',
        'ingredient',
        'amount',
        'quantity',
        'medication',
        'property',
        'available',
    ];
    options.order = [['primaryCategory'], ['secondaryCategory']];

    // 선택한 경우
    if (categoryMain) {
        options.where.primaryCategory = categoryMain;
        if (categorySmall) {
            options.where.secondaryCategory = categorySmall;
        }
    } else if (searchText) {
        options.where[searchSet] = searchText;
    }

    try {
        const medicines = await medicineModel.listTwo(options);
        conf.rows = _.map(medicines, medicine => {
            const row = medicine.get({ plain: true });
            row.available = row.available ? '활성' : '비활성';
            return _.values(row)
        });
        const excelFile = require('excel-export').execute(conf);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats');
        res.setHeader("Content-Disposition", `attachment; filename=medicine.xlsx`);
        res.end(excelFile, 'binary');

    } catch (error) {
        res.json(error);
    }
})

router.get('/inventory/excel', async (req, res, next) => {
    const { categoryMain, categorySmall, searchSet, searchText } = req.query;
    const options = {};
    const conf = {};


    conf.name = "inventory";
    conf.cols = [
        { caption: '대 분류', type: 'string' },
        { caption: '소 분류', type: 'string' },
        { caption: '약 품명', type: 'string' },
        { caption: '성분명 및 함량', type: 'string' },
        { caption: '용량', type: 'string' },
        { caption: '포장 단위', type: 'number' },
        { caption: '유효기간', type: 'string' },
        { caption: '재고', type: 'number' },
        { caption: '총량', type: 'number' },
        { caption: '메모', type: 'string' },
    ];
    options.where = {};
    options.attributes = [
        'primaryCategory', 'secondaryCategory', 'name',
        'ingredient',
        'capacity',
        'amount',
        'expiry',
        'quantity',
        'totalAmount',
        'memo',
    ];

    if (categoryMain) {
        options.where.primaryCategory = categoryMain;
        if (categorySmall) {
            options.where.secondaryCategory = categorySmall;
        }
    } else if (searchText) {
        options.where[searchSet] = searchText;
    }

    try {
        const medicines = await medicineModel.listTwo(options);
        conf.rows = _.map(medicines, medicine => _.values(medicine.get({ plain: true })));

        const excelFile = require('excel-export').execute(conf);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats');
        res.setHeader("Content-Disposition", `attachment; filename=inventory.xlsx`);
        res.end(excelFile, 'binary');

    } catch (error) {
        res.json(error)
    }
});



router.get('/history/excel', async (req, res) => {

    const { searchSet, searchText } = req.query;
    let { startTime, endTime } = req.query;
    const conf = {};
    startTime += ' 00:00:00';
    endTime += ' 23:59:59';

    const options = {};
    options.include = { model: Medicine, attributes: ['primaryCategory', 'secondaryCategory', 'totalAmount', 'quantity'] }
    options.where = { useFlag: '1', createdAt: {between: [startTime, endTime] } }
    options.attributes = ['medicineName', 'medicineIngredient', [sequelize.fn('SUM', sequelize.col('prescription.useTotal')), 'total']]
    options.group = ['prescription.medicine_id']

    if (searchText) {
        searchSet === 'name'
            ? options.where.medicineName = searchText
            : options.where.medicineIngredient = searchText;
    }

    conf.name = "history";
    conf.cols = [
        { caption: '대 분류', type: 'string' },
        { caption: '소 분류', type: 'string' },
        { caption: '약 품명', type: 'string' },
        { caption: '성분명 및 함량', type: 'string' },
        { caption: '사용량', type: 'number' },
        { caption: '잔여 총량', type: 'number' },
        { caption: '재고', type: 'number' },
    ];

    try {
        const results = await prescriptionModel.history(options)
        conf.rows = _.map(results, result => {
          console.log(result);
          const { primaryCategory, secondaryCategory, medicineName, medicineIngredient, total, totalAmount, quantity } = result
          return [
             primaryCategory, secondaryCategory, medicineName, medicineIngredient,
             total, totalAmount, quantity
          ];
        });

        const excelFile = require('excel-export').execute(conf);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats');
        res.setHeader("Content-Disposition", `attachment; filename=history.xlsx`);
        res.status(200).end(excelFile, 'binary');

    } catch (error) {
        res.json(error)
    }

    // TODO SEARCH [DEP0018] DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.

    // prescriptionModel
    //     .history(options)
    //     .then((results) => {
    //         conf.rows = _.map(results, result => {
    //             const historyMedicine = result.get({ plain: true });
    //             const { medicine } = historyMedicine;
    //             return [
    //                medicine.primaryCategory, medicine.secondaryCategory,
    //                historyMedicine.medicineName, historyMedicine.medicineIngredient,
    //                historyMedicine.total,
    //                medicine.totalAmount, medicine.quantity
    //             ];

                // return [
                //     medicine.primaryCategory, medicine.secondaryCategory,
                //     historyMedicine.medicineName, historyMedicine.medicineIngredient,
                //     historyMedicine.total,
                //     medicine.totalAmount, medicine.quantity
                // ];

                // const { medicineName, medicineIngredient, total } = result
                // const primaryCategory = result['medicine.primaryCategory']
                // const secondaryCategory = result['medicine.secondaryCategory']
                // const totalAmount = result['medicine.totalAmount']
                // const quantity = result['medicine.quantity']
                // console.log(medicineName)
                // console.log(medicineIngredient)
                // console.log(total)
                // console.log(primaryCategory)
                // console.log(secondaryCategory)
                // console.log(totalAmount)
                // console.log(quantity)
                // console.log(typeof result)
                // console.log(result)
                // const historyMedicine = result.get({ plain: true });
                // const { medicine } = historyMedicine;
                // console.log(result.medicine.primaryCategory)
                // return [ primaryCategory, secondaryCategory, medicineName, medicineIngredient, total, totalAmount, quantity ]
                // return [ medicineName, medicineIngredient, total ]
            // });

            // const excelFile = require('excel-export').execute(conf);
            // console.log(excelFile);
            //
            // res.setHeader('Content-Type', 'application/vnd.openxmlformats');
            // res.setHeader('Content-Disposition', 'attachment; filename=history.xlsx');
            // res.end(excelFile, 'binary');

            // respondJson(res, resultCode.success, excelFile)
        // })
        // .catch((error) => {
        //     console.log('error', error)
        //     res.send(error);
        // })
})






module.exports = router;
