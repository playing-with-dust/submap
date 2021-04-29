const jQuery = require("jquery")
const {ss58Encode, ss58Decode} = require('./address.js')
const api = require('./api.js')
const {fromHexString} = require('./utils.js')

var viz_id = 0
var max_depth = 6
var addr_map = {}
var max_batch_calls = 10

const linkifyAddress = (address) => {
    return "<a href='./index.html?address=" + address + "'>"+address+"</a>"
}

const timeStampToString = (unix_timestamp) => {
    var a = new Date(unix_timestamp * 1000);    
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
    return time;
}



const vizParams = async (id,depth,call_module,call_function,params) => {
    let ret=""
    let label=""
    for (let param of params) {
	label+="<small>"+param.name+"</small><br>"
	
	if ((call_function=="batch" || call_function=="batch_all") &&
	    param.name=="calls") {
	    let count = 0
	    for (let call of param.value) {
		if (count<max_batch_calls) {
		    ret += await vizBatchCall(id,depth,call);
		}
		// if we're a validator, this is very boring
		if (count==max_batch_calls) {
		    let tid = viz_id
		    viz_id+=1
		    ret += id+"->"+tid+"\n"
		    ret += tid+" [label=\"Calls truncated...\"]\n"
		}
		count+=1
	    }
	}
	
	if ((call_function=="bond" ||
	     call_function=="set_controller") &&
	    param.name=="controller") {
	    let addr
	    if (param.value.Id) {
		addr=ss58Encode(fromHexString(param.value.Id))
	    } else {
		addr=ss58Encode(fromHexString(param.value))
	    }
	    ret += await vizAddress(id,depth+1,addr)
	}
	
/*	if (call_function=="bond" &&
	    param.name=="payee") {
	    let addr
	    console.log(param.value)
	    addr=ss58Encode(fromHexString(param.value.Account))
	    label += linkifyAddress(addr)+"<br>"
	}
*/
	if (call_function=="add_proxy" &&
	    param.name=="delegate") {
	    let addr
	    if (param.value.Id) {
		addr=ss58Encode(fromHexString(param.value.Id))
	    } else {
		addr=ss58Encode(fromHexString(param.value))
	    }
	    //label += linkifyAddress(addr)+"<br>"
	    ret += await vizAddress(id,depth+1,addr)
	}

	if (call_function=="nominate" &&
	    param.name=="targets") {
	    for (let v of param.value) {
		let addr
		if (v.Id) {
		    addr=ss58Encode(fromHexString(v.Id))
		} else {
		    addr=ss58Encode(fromHexString(v))
		}
		label += linkifyAddress(addr)+"<br>"
	    }
	}
	
	if ((call_function=="transfer_keep_alive" ||
	     call_function=="transfer") &&
	    param.name=="dest"){
	    let addr
	    if (param.value.Id) {
		addr=ss58Encode(fromHexString(param.value.Id))
	    } else {
		addr=ss58Encode(fromHexString(param.value))
	    }
	    label += linkifyAddress(addr)+"<br>" 
	}	


    }	
    return {label:label,children:ret}
}

const vizBatchCall = async (parent,depth,call) => {
    if (depth>max_depth) return ""
    let id = viz_id
    viz_id+=1
    let ret=""
    let label="<b>"+call.call_module+"/"+call.call_function+"</b><br>"    
    let args = call.call_args
    if (!args) args = call.params

    let p = await vizParams(id,depth+1,call.call_module,
			    call.call_function,
			    args);
    ret+=p.children;
    ret+=id+" [labelType=\"html\" label=\""+label+p.label+"\"]\n" 
    return ret+parent+"->"+id+"\n"
}

const vizExtrinsic = async (parent,depth,x) => {
    if (depth>max_depth) return ""
    let id = viz_id
    viz_id+=1
    let ret=""
    let label="<u>"+timeStampToString(x.block_timestamp)+"</u><br><b>"+x.call_module+"/"+x.call_module_function+"</b><br>"    
    let args = x.call_args    
    if (!args) args = x.params
    args = JSON.parse(args)
    if (args) {
	let p = await vizParams(id,depth,x.call_module,x.call_module_function,args)
	ret+=p.children
	ret+=id+" [labelType=\"html\" label=\""+label+p.label+"\"]\n"
    } else {
	ret+=id+" [labelType=\"html\" label=\""+label+"\"]\n"
    }
    return ret+parent+"->"+id+"\n"
}

const vizAddress = async (parent,depth,address) => {
    if (depth>max_depth) return ""
    if (addr_map[address]!=undefined) {
	return parent+"->"+addr_map[address]+"\n"
    } else {	
	let ret="";
	let id = viz_id
	viz_id+=1
	addr_map[address]=id
	
	let xs = await api.getExtrinsics(address)
	if (xs.data.count>0) {
	    for (let x of xs.data.extrinsics) {
		ret+=await vizExtrinsic(id,depth+1,x)
	    }
	}
	ret+=id+" [labelType=\"html\" label=\""+linkifyAddress(address)+"\"]\n" 
	if (parent==-1) {
	    return ret
	} else {
	    return ret+"\n"+parent+"->"+id+"\n"
	}
    }
}

export { vizAddress };
