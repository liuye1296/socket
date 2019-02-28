const http = require('http');
const WebSocket = require('ws');
//20s
const _outTime = 20000;
const server = http.createServer();
const wss = new WebSocket.Server({ server });
const _OnLine = {//在线的对象 key fromId vue Socket通信对象

}
wss.on('connection', function connection(ws, req) {
    ws.isAlive = true;
    ws.on('pong', heartbeat);
    ws.on('message', message => {
        const _obj = JSON.parse(message);
        if (_obj.type && _obj.type === 'LOGIN') {
            //Socket唯一校验    
            const _id=_obj.fromId+(_obj.toId||'');      
            loginOne(_id, ws)
        } else {
            try {
                //有两种情况 第一种是传了toId  说明这个ws 只跟这个人聊天 只要toId不一样  可以存在多个
                //没有传toId 这个ws会接受所有给他发送的消息 
                const _toSocket=_OnLine[_obj.toId+_obj.fromId] || _OnLine[_obj.toId];
                
                if (_toSocket && _toSocket.send) {//要发送的人在线呀
                    const _data={
                        fromId:_obj.fromId,
                        msg:_obj.msg
                    }
                    _toSocket.send(JSON.stringify(_data));
                } else {//不在线
                   // _OnLine[_obj.fromId].send('不在线');
                }
            } catch (error) {
                console.error('发送失败' + error)
            }
        }
    });

    ws.on('error', error => {
        console.error('error异常' + error)
        ws.close && ws.close();
    });
    ws.on('close', error => {
        try {
            //ws.close && ws.close();
            if(!ws.is_close){//客户端发起的关闭 就删除这个对象  服务器发起删除是因为做唯一 
                delete _OnLine[ws.id]//删除该对象
            }else{
                ws.is_close=false;
            }
        } catch (error) {
          console.error('ws关闭' + error)
        }
    });

});

wss.on('error', function (error) {
    console.log('wss异常' + error)
})

const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) {
            try {
                _OnLine[ws.id] && delete _OnLine[ws.id];//清理很久没有发送消失的对象 
            } catch (error) {
                console.log('清理很久没有发送消失的对象异常=' + error)
            }
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping(noop);
    });
}, _outTime);

function noop() { }

//登录存在唯一
function loginOne(resId, ws) {
    const _this = _OnLine[resId];
    //console.log(_this)
    if (_this) {
        // _this.send(JSON.stringify({
        //     type: '-1001',
        //     msg: '已经在另一台设备登录'
        // }));
        // try {
            _this.terminate();
            //_this.close();
            _this.is_close=true;//服务器删除
            delete _OnLine[resId];
        // } catch (error) {

        // }
    }
    //添加身份标示    
    ws.id = resId;
   
    //保存该对象
    _OnLine[ws.id] = ws;

}

function heartbeat() {
    this.isAlive = true;
}

server.listen(8001);
console.log('8001监听成功')