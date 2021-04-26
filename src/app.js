const jQuery = require("jquery")
const {ss58Encode, ss58Decode} = require('./address.js')
const api = require('./api.js')
const {fromHexString} = require('./utils.js')

var viz_id = 0
var max_depth = 4
var addr_map = {}
var max_batch_calls = 10

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
		    count+=1
		}
	    }
	}
	
	if (call_function=="bond" &&
	    param.name=="controller") {
	    let addr
	    if (param.value.Id) {
		addr=ss58Encode(fromHexString(param.value.Id))
	    } else {
		addr=ss58Encode(fromHexString(param.value))
	    }
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
		label += addr+"<br>" // await vizAddress(id,depth+1,addr)
	    }
	}	

    }	
    return {label:label,children:ret}
}

const vizBatchCall = async (parent,depth,call) => {
    if (depth>max_depth) return ""
    let id = viz_id
    viz_id+=1
    let ret=""
    let label=call.call_module+"/"+call.call_function+"<br>"    
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
    let label=x.call_module+"/"+x.call_module_function+"<br>"    
    let p = await vizParams(id,depth,x.call_module,x.call_module_function,JSON.parse(x.params))
    ret+=p.children
    ret+=id+" [labelType=\"html\" label=\""+label+p.label+"\"]\n" 
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
	let label=address
	ret+=id+" [labelType=\"html\" label=\""+label+"\"]\n" 
	if (parent==-1) {
	    return ret
	} else {
	    return ret+"\n"+parent+"->"+id+"\n"
	}
    }
}

export { vizAddress };
