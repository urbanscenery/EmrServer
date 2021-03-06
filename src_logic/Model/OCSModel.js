const moment = require('moment');
const sequelize = require('sequelize');
const dbService = require('../Service/SequelizeService.js');
const ocs = require('../Entity/OCS.js');

var OCSModel = function (data) {
  this.data = data;
}

OCSModel.receipt = function (patient, chart, callback) {
  ocs.create({
    chart_id: chart.id,
    chartNumber: chart.chartNumber,
    name: patient.name,
    gender: patient.gender,
    birth: moment(patient.birth).format('YYYY-MM-DD').toString()
  }).then(result => {
    callback(result.id)
  }).catch(error => {
    callback(error)
  })
}

OCSModel.preDiagonosis = function (data, callback) {
  ocs.update({
    status: 2
  }, {
      where: { chartNumber: data }
    }).then(callback)
}

OCSModel.originalDiagnosis = function (data, callback) {
  ocs.update({
    status: 3
  }, {
      where: { chartNumber: data }
    }).then(callback)
}

OCSModel.prescription = function (data, callback) {

}

OCSModel.find = async function (options) {

  const { limit, attributes, where, order } = options;
  if (limit) {
    return await ocs.findAll(options)
  } else {
    return await ocs.findOne({
      attributes, where, order
    })
  }
}

OCSModel.findAll = async function (options) {

  return ocs.findAll(options)
};

OCSModel.count = async function (options) {

  const { where = {} } = options;
  return ocs.count({ where });
}

OCSModel.update = async function (options) {

  const { where = {}, update = {} } = options;
  return await ocs.update(update, { where: where })
}

module.exports = OCSModel;
