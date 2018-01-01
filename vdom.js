/**
 * Virtual DOM patching algorithm based on Snabbdom by
 * Simon Friis Vindum (@paldepind)
 * Licensed under the MIT License
 * https://github.com/paldepind/snabbdom/blob/master/LICENSE
 *
 * modified by hpoenixf
 *
 */
const is = {
  array: Array.isArray,
  primitive: s => typeof s === 'string' || typeof s === 'number',
}

function sameVnode(vnode1, vnode2) {return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel;}

function createKeyToOldIdx(children, beginIdx, endIdx) {
  let i, map = {}, key, ch;
  for (i = beginIdx; i <= endIdx; ++i) {
    ch = children[i];
    if (ch != null) {
      key = ch.key;
      if (key !== undefined) map[key] = i;
    }
  }
  return map;
}

function vnode (sel, data, children, text, elm) {
  let key = data === undefined ? undefined : data.key
  return {sel, data, children, text, elm, key};
}

function isUndef(s) { return s === undefined; }

function isDef(s) { return s !== undefined; }

function emptyNodeAt(elm) {
  const id = elm.id ? '#' + elm.id : '';
  const c = elm.className ? '.' + elm.className.split(' ').join('.') : '';
  return vnode(elm.tagName.toLowerCase() + id + c, {}, [], undefined, elm);
}

function createElm(vnode) {
  let children = vnode.children, sel = vnode.sel;
  if (sel !== undefined) {
    // Parse selector
    const hashIdx = sel.indexOf('#');
    const dotIdx = sel.indexOf('.', hashIdx);
    const hash = hashIdx > 0 ? hashIdx : sel.length;
    const dot = dotIdx > 0 ? dotIdx : sel.length;
    const tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;
    const elm = vnode.elm = document.createElement(tag);
    if (hash < dot) elm.setAttribute('id', sel.slice(hash + 1, dot));
    if (dotIdx > 0) elm.setAttribute('class', sel.slice(dot + 1).replace(/\./g, ' '));
    if (is.array(children)) {
      for (let i = 0; i < children.length; ++i) {
        const ch = children[i];
        if (ch != null) {
          elm.appendChild(createElm(ch));
        }
      }
    } else if (is.primitive(vnode.text)) {
      elm.appendChild(document.createTextNode(vnode.text));
    }
  } else {
    vnode.elm = document.createTextNode(vnode.text);
  }
  return vnode.elm;
}

function addVnodes(parentElm, before, vnodes, startIdx, endIdx) {
  for (; startIdx <= endIdx; ++startIdx) {
    const ch = vnodes[startIdx];
    if (ch != null) {
      parentElm.insertBefore(createElm(ch), before);
    }
  }
}

function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
  for (; startIdx <= endIdx; ++startIdx) {
    parentElm.removeChild(vnodes[startIdx].elm)
  }
}

function updateChildren(parentElm, oldCh, newCh) {
  let oldStartIdx = 0, newStartIdx = 0;
  let oldEndIdx = oldCh.length - 1;
  let oldStartVnode = oldCh[0];
  let oldEndVnode = oldCh[oldEndIdx];
  let newEndIdx = newCh.length - 1;
  let newStartVnode = newCh[0];
  let newEndVnode = newCh[newEndIdx];
  let oldKeyToIdx
  let idxInOld
  let elmToMove
  checkKeyDuplicate(newCh)
  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    if (oldStartVnode == null) {
      oldStartVnode = oldCh[++oldStartIdx]; // Vnode might have been moved left
    } else if (oldEndVnode == null) {
      oldEndVnode = oldCh[--oldEndIdx];
    } else if (newStartVnode == null) {
      newStartVnode = newCh[++newStartIdx];
    } else if (newEndVnode == null) {
      newEndVnode = newCh[--newEndIdx];
    } else if (sameVnode(oldStartVnode, newStartVnode)) {
      patchVnode(oldStartVnode, newStartVnode);
      oldStartVnode = oldCh[++oldStartIdx];
      newStartVnode = newCh[++newStartIdx];
    } else if (sameVnode(oldEndVnode, newEndVnode)) {
      patchVnode(oldEndVnode, newEndVnode);
      oldEndVnode = oldCh[--oldEndIdx];
      newEndVnode = newCh[--newEndIdx];
    } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
      patchVnode(oldStartVnode, newEndVnode);
      parentElm.insertBefore(oldStartVnode.elm, oldEndVnode.elm.nextSibling)
      oldStartVnode = oldCh[++oldStartIdx];
      newEndVnode = newCh[--newEndIdx];
    } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
      patchVnode(oldEndVnode, newStartVnode);
      parentElm.insertBefore(oldEndVnode.elm, oldStartVnode.elm);
      oldEndVnode = oldCh[--oldEndIdx];
      newStartVnode = newCh[++newStartIdx];
    } else {
      if (oldKeyToIdx === undefined) {
        oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
      }
      idxInOld = oldKeyToIdx[newStartVnode.key];
      if (isUndef(idxInOld)) { // New element
        parentElm.insertBefore(createElm(newStartVnode), oldStartVnode.elm);
        newStartVnode = newCh[++newStartIdx];
      } else {
        elmToMove = oldCh[idxInOld];
        if (elmToMove.sel !== newStartVnode.sel) {
          parentElm.insertBefore(createElm(newStartVnode), oldStartVnode.elm);
        } else {
          patchVnode(elmToMove, newStartVnode);
          oldCh[idxInOld] = undefined
          parentElm.insertBefore(elmToMove.elm, oldStartVnode.elm);
        }
        newStartVnode = newCh[++newStartIdx];
      }
    }
  }
  if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
    if (oldStartIdx > oldEndIdx) {
      let before = newCh[newEndIdx+1] == null ? null : newCh[newEndIdx+1].elm;
      addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx);
    } else {
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
    }
  }
}

function checkKeyDuplicate (vnode) {
  let keys = {}
  for (let i of vnode) {
    if (keys[i.key]) {
      throw new Error('key deplicate')
    }
    keys[i.key] = true
  }
}

function patchVnode(oldVnode, vnode) {
  const elm = vnode.elm = (oldVnode.elm);
  let oldCh = oldVnode.children;
  let ch = vnode.children;
  if (oldVnode === vnode) return;
  if (isUndef(vnode.text)) {
    if (isDef(oldCh) && isDef(ch)) {
      if (oldCh !== ch) updateChildren(elm, oldCh, ch);
    } else if (isDef(ch)) {
      if (isDef(oldVnode.text)) elm.textContent =  '';
      addVnodes(elm, null, ch, 0, ch.length - 1);
    } else if (isDef(oldCh)) {
      removeVnodes(elm, oldCh, 0, oldCh.length - 1);
    } else if (isDef(oldVnode.text)) {
      elm.textContent = '';
    }
  } else if (oldVnode.text !== vnode.text) {
    elm.textContent = vnode.text;
  }
}

function h (sel, b, c) {
  var data = {}, children, text, i;
  if (c !== undefined) {
    data = b;
    if (is.array(c)) { children = c; }
    else if (is.primitive(c)) { text = c; }
    else if (c && c.sel) { children = [c]; }
  } else if (b !== undefined) {
    if (is.array(b)) { children = b; }
    else if (is.primitive(b)) { text = b; }
    else if (b && b.sel) { children = [b]; }
    else { data = b; }
  }
  if (is.array(children)) {
    for (i = 0; i < children.length; ++i) {
      if (is.primitive(children[i])) children[i] = vnode(undefined, undefined, undefined, children[i], undefined);
    }
  }
  return vnode(sel, data, children, text, undefined);
}

 function patch(oldVnode, vnode) {
  if (oldVnode.sel === undefined) {
    oldVnode = emptyNodeAt(oldVnode);
  }
  if (sameVnode(oldVnode, vnode)) {
    patchVnode(oldVnode, vnode);
  } else {
    let elm = oldVnode.elm
    let parent = elm.parentNode;
    createElm(vnode);
    if (parent !== null) {
      parent.insertBefore(vnode.elm, elm.nextSibling);
      removeVnodes(parent, [oldVnode], 0, 0);
    }
  }
  return vnode;
}