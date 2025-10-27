import { h } from "preact";
import appstate from "../../appstate";

export function FieldItemRegex() {
    return <div>
        <input type="text" name="fieldItemRegex" value={appstate.fieldItemRegex.value} onChange={e => {
            appstate.fieldItemRegex.value = e.currentTarget.value;
        }}/>
        <label for="fieldItemRegex">Substring for field <button onClick={() => appstate.fieldItemRegexMaterial.value = !appstate.fieldItemRegexMaterial.value}>{appstate.fieldItemRegexMaterial.value ? "material" : "object"}</button></label>
    </div>;
}