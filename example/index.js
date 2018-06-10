function view () {
  let randomIndex = Math.floor(Math.random() * 10)
  let children = [...Array(5).keys()].map(i => {
    return h('li',{key:++randomIndex },randomIndex)
  })
  return h('ul', children )
}
let VDOM = patch(document.querySelector('#root'),view())
let time = 0
let i = setInterval(() => {
  time++
  if(time > 10) return
  VDOM = patch(VDOM, view())
}, 1000)
