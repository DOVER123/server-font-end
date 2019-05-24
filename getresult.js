/*
 * @Author: Dongge
 * @Date: 2019-05-24 10:13:55
 * @LastEditTime: 2019-05-24 10:17:58
 * 引用前需要引入jq.
 */

var getResult = function (sql, dataSource) {
    var result = {};
    var params = {'sql':sql,'dataSource':dataSource};
    params = escape(encodeURIComponent(JSON.stringify(params)));
    $.ajax({
        'url': 'http://127.0.0.1:8124/getResult',
        'method': 'POST',
        'data': params,
        'async':false,
        'dataType':"json",
        'success': function (data) {

            if(data.flag == 1){
                result = data.data;
            }else{
                alert(data.err);
            }
        }, error: function (XMLHttpRequest, textStatus, errorThrown) {
            alert('错误：' + XMLHttpRequest.status + '/' + XMLHttpRequest.readyState + "/" + textStatus)
        }
    });
    return result;
}