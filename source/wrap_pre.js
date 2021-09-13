// Holy hell, wtf, bbq! If we don't wrap the whole game in a global function,
// installed on the window scope, everything will be garbage collected in chrome
// in the roadrolled version, even though the requestAnimationFrame should hold
// on to the closure.

// I assumme it's a weird interaction between eval() (used by roadroller) and 
// async functions. In any case, it seems to be a bug in v8.

gs = () => {